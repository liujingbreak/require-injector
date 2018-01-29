export declare function toAssignment(parsedInfo: ParseInfo, valueStr: string): string;
export interface ParseInfo {
    vars: {
        [k: string]: string;
    };
    defaultVars: string[];
    from: string;
}
export declare function parse(ast: any): ParseInfo;
