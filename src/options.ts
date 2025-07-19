import prompt from "prompt";

export interface IScrappedData {
    Episode: number
    Url: string
    Type: string
}

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
            },
            loadFromSchema: {
                type: 'boolean',
                message: 'Load from file',
                default: false
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

                if(properties.loadFromSchema){
                    prompt.get({
                        properties: {
                            generatedSchema: {
                                type: "string",
                                required: true,
                            }
                        }
                    }, function(err, result){
                        if(err)
                        {
                            reject(err);
                            return;
                        }
                        const schemaText = OptionsFactory.parseSchemaText(result['generatedSchema'] as string, properties.episodeCount);
                        if(schemaText === undefined){
                            reject("Invalid schema");
                            return;
                        }

                        properties.episodeUrls = schemaText;
                        resolve(properties);
                    })
                }else{
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
                }


            })
        })
    }

    private static parseSchemaText(schema: string, episodeCount: number) : string[] | undefined {
        try {
            const jsonSchema : IScrappedData[] = JSON.parse(schema)
            const map = jsonSchema.map(x => x.Url);
            if(map.length === episodeCount)
                return map

            return undefined;
        }catch(e){
            const splitLines = schema.split("\n");
            if(splitLines.length === episodeCount)
            {
                const strings: string[] = [];
                splitLines.forEach(x => {
                    if(!x.startsWith("https://pixeldrain"))
                        return;

                    if(x.includes("/u/"))
                    {
                        x = x.replace("/u/", "/api/file/");
                    }

                    if(!x.endsWith("?download")){
                        x = x + "?download";
                    }

                    strings.push(x);
                })

                return strings;
            }

            return undefined;
        }
    }

}