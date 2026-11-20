import { createContext } from 'react';

export const MaterialImportContext=createContext<((id?:string)=>void)|null>(null);
export const MaterialRewriteContext=createContext<((id:string)=>void)|null>(null);
