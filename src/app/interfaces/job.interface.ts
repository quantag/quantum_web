export interface IJob {
    end_time: string | null;
    input: string;
    instance: string | null;
    job_id: string | null;
    mode: string | null;
    provider_id: string;
    qpu: string | null;
    region: string | null;
    results: string;
    start_time: string | null;
    status: number;
    status_str: string;
    time: string | null;
    uid: string;
    usage: string | null;
    user_id: string;
}