export interface GuppyFunction {
  compile_sig: string;
  end_lineno: number;
  has_compile: boolean;
  lineno: number;
  name: string;
}

export interface GuppyAnalysisResponse {
  count: number;
  functions: GuppyFunction[];
  ok: boolean;
}

export interface GuppyCompileResponse {
  results: { [functionName: string]: GuppyCompileFunctionResult };
  ok: boolean;
}

export interface GuppyCompileFunctionResult {
  hugr?: string;
  json?: string;
  str?: string;
}
