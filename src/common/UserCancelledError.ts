export class UserCancelledError extends Error {
    constructor() {
        super("Operation cancelled.");
    }
}
