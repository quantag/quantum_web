export interface IApiUser {
    balance: number | null;
    company: string | null;
    firstname: string;
    lastname: string;
    subscription_id: number | null;
    uid: string;
    status: string;
    google_id: string;
}