export class ErrorData {
    public readonly message: string;
    public readonly errorType: string;
    constructor(error: any) {
        if (error instanceof Error) {
            try {
                this.errorType = JSON.parse(error.message).Code;
                this.message = JSON.parse(error.message).Message;
            } catch (err) {
                this.errorType = error.constructor.name;
                this.message = error.message;
            }
        } else if (typeof (error) === "object" && error !== null) {
            this.errorType = (error as object).constructor.name;
            this.message = JSON.stringify(error);
        } else if (error !== undefined && error !== null && error.toString && error.toString().trim() !== "") {
            this.errorType = typeof (error);
            this.message = error.toString();
        } else {
            this.errorType = typeof (error);
            this.message = "Unknown Error";
        }
    }
}
