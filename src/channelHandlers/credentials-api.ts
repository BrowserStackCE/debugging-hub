import CONFIG from "../constants/config";
import StorageKeys from "../constants/storage-keys";
import getStorage from "../storage";

export const setBrowserStackAdminCredentials: CredentialsAPI['setBrowserStackAdminCredentials'] = async (username, accessKey,_rev) => {
    return getStorage().put({
        _id: StorageKeys.bstackAdminCredentials,
        username,
        accessKey,
        _rev
    }).then((res)=>{
        CONFIG.username = username
        CONFIG.accessKey = accessKey
        return res.rev
    })
}

export const getBrowserStackAdminCredentials: CredentialsAPI['getBrowserStackAdminCredentials'] = async () => {
    try{
        const creds = await getStorage().get<BrowserStackCredentials>(StorageKeys.bstackAdminCredentials);
        return {
            username: creds.username,
            accessKey: creds.accessKey,
            _rev:creds._rev
        }
    }catch(err){
        return null
    }
}