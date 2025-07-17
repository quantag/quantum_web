export interface IApiUser {
    balance: number | null;
    company: string | null;
    firstname: string;
    lastname: string;
    subscription_id: string | null;
    uid: string;
    status: number;
    google_id: string;
}