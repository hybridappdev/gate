export type Finding = {
    file: string;
    line: number;
    rule: "hex" | "library" | "layout";
    message: string;
};
export declare function scan(root: string): Finding[];
