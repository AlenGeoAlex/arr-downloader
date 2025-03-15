import prompt from "prompt";



export interface IOptions {
    [key: string]: any;
    baseFolder: string;
    name: string;
    season: number
    episodeCount: number;
    episodeUrls: string[];
    parallelDownloadCount: number;
    year: string
}

export class OptionsFactory {

    private readonly baseSchema = {
        properties: {
            baseFolder: {
                type: 'string',
                message: 'Base folder must be only letters, spaces, or dashes',
                required: true
            },
            name: {
                type: 'string',
                message: 'Name must be only letters, spaces, or dashes',
                required: true
            },
            year: {
                type: 'string',
                pattern: /^\d+$/,
                message: 'Year must be only numbers',
                required: true
            },
            season: {
                type: 'number',
                message: 'Season must be number',
                default: 1
            },
            episodeCount: {
                type: 'number',
                message: 'Episodes count must be number',
                default: 1
            },
            parallelDownloadCount: {
                type: 'number',
                message: 'Parallel Download count must be number',
                default: 1
            }
        }
    };

    public init() : Promise<IOptions> {
        return new Promise<IOptions>((resolve, reject) => {
            // @ts-ignore
            prompt.get(this.baseSchema, function(err, result){
                if(err)
                {
                    reject(err);
                    return;
                }

                const properties = result as IOptions;

                prompt.get({
                    properties: {
                        episodes: {
                            type: "array",
                            required: true,
                            maxItems: properties.episodeCount
                        }
                    }
                }, function(err, result){
                    if(err)
                    {
                        reject(err);
                        return;
                    }

                    properties.episodeUrls = result.episodes as string[];
                    resolve(properties);
                })
            })
        })
    }

}