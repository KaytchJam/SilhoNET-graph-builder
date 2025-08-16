export type EnumLike<T> = T[keyof T];
export type EnumPick<T, K extends keyof T> = T[K];