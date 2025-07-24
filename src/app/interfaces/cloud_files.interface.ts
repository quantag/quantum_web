export interface FileItem {
  name: string;
  isDirectory: boolean;
}

export interface FileMetadata {
  isDirectory: boolean;
  ctime: number;
  mtime: number;
  size: number;
}

export interface SuccessResponse {
  success: boolean;
}

export interface RenameRequest {
  oldPath: string;
  newPath: string;
}