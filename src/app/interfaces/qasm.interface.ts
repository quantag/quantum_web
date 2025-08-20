
export interface QubitsDataInterface {
    qubits: QubitInterface[]
}

export interface QubitInterface {
    [key: string]: ParsedGateElement[]
}

export interface QasmCodeInterface {
    code: string
}

export interface ParsedGateElement {
    type: string;
    params?: {
        start?: string,
        end?: string,
        enabled?: boolean
    }
}

export interface HistogramData {
    results: {data:number}[]
}

export interface HistogramDataInterface {
    name: string,
    value: number
}

export interface ICircuit {
    cregs: unknown;
    customGates: unknown;
    gates: Qubit[];
    numQubits: number;
    options: ICircuitOptions;
    params: unknown[];
}

export interface ICircuitOptions {
    params: unknown;
    hybrid: boolean;
    hybridOptions: ICircuitHybridOptions;
}

export interface ICircuitHybridOptions {
    optimizer: string,
    tolerance: number,
}

export interface IGate {
    id: string,
    name: string,
    connector: number,
    options: {
        params: IGateParams,
        condition: unknown
    }
}

export type Qubit = (IGate | ILineGate)[];

export interface IwebSocketStateResponse {
    command: 'update';
    line: number;
    states: IStateElement[];
    code?: string;
}

export interface IwebSocketCodeResponse {
    command: 'load';
    code: string;
}

export interface IwebSocketSessionIdResponse {
    id: string;
}

export interface IStateElement {
    a:number;
    b:number;
}

export interface IGateParams {
    lambda?: string;
}

export interface IParsedCodeResponse {
    code: string;
}

export type ILineGate = Omit<IGate, 'options'>;
