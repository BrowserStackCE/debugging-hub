import {shell} from 'electron'


export async function openExternalUrl(url:string){
    await shell.openExternal(url)
}