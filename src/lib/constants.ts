export const API_URL =
    "https://gabf3ab0d5e4acf-o8bjtqb8kgvlc8uw.adb.eu-stockholm-1.oraclecloudapps.com/ords/admin/api";

interface UserMap {
    [key: string]: {
        username: string;
        displayName: string;
    };
}

export const userMap: UserMap = {
    "320542672206954496": {
        username: "SaowManBarre",
        displayName: "Kristian",
    },
};
