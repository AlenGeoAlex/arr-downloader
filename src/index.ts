import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { MultiBar, SingleBar } from 'cli-progress';
import {IOptions, OptionsFactory} from "./options";

const downloadEpisodeWithProgress = async (
    url: string,
    downloadPath: string,
    progressBar: SingleBar
): Promise<void> => {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        const totalSize = parseInt(response.headers['content-length'] || '0', 10);

        const writer = fs.createWriteStream(downloadPath);
        let downloadedSize = 0;

        // Update the progress bar as chunks are downloaded
        response.data.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length;
            progressBar.update(downloadedSize);
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Failed to download ${url}:`, error);
        progressBar.stop();
    }
};

const parallelDownloadsWithProgress = async (
    urls: string[],
    parallelCount: number,
    downloadFolder: string,
    options: IOptions
): Promise<void> => {
    const multiBar = new MultiBar({ clearOnComplete: false, hideCursor: true });

    const queue: Promise<void>[] = [];
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        if(!url.startsWith("https") && !url.startsWith("http"))
        {
            console.log(`Skipping ${url} of episode ${i}`);
            continue;
        }

        const episodeNumber = (i + 1).toString().padStart(2, '0');
        const downloadPath = path.join(downloadFolder, `${options.name} S${options.season.toString().padStart(2, '0')}E${episodeNumber}.mp4`);

        const progressBar = multiBar.create(100, 0, {
            episode: `Episode ${episodeNumber}`,
            options: {
                format: `progress - Episode ${episodeNumber} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}`
            }
        });

        // Add a download task to the queue
        queue.push(
            (async () => {
                const totalSize = parseInt(
                    (
                        await axios.head(url).catch(() => ({
                            headers: { 'content-length': '0' },
                        }))
                    ).headers['content-length'],
                    10
                );

                progressBar.setTotal(totalSize); // Set total size for the progress bar
                await downloadEpisodeWithProgress(url, downloadPath, progressBar);
                progressBar.stop();
            })()
        );

        // Process batch if parallelCount is reached
        if (queue.length === parallelCount || i === urls.length - 1) {
            await Promise.all(queue); // Wait for all current downloads to finish
            queue.length = 0; // Clear the queue for the next batch
        }
    }

    multiBar.stop(); // Stop the progress bars
};

const main = async (): Promise<void> => {
    const factory = new OptionsFactory();
    const options = await factory.init();

    console.log(JSON.stringify(options))

    const seasonFolder = path.join(
        options.baseFolder,
        `${options.name} (${options.year})`,
        `Season ${options.season.toString().padStart(2, '0')}`
    );

    fs.mkdirSync(seasonFolder, { recursive: true });

    console.log(`Downloading to: ${seasonFolder}`);
    console.log(`Starting parallel downloads with ${options.parallelDownloadCount} at a time...`);

    await parallelDownloadsWithProgress(options.episodeUrls, options.parallelDownloadCount, seasonFolder, options);

    console.log('All downloads completed.');
};

main().catch(console.error);