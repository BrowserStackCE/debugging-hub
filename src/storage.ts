import PouchDB from 'pouchdb';

export default function getStorage(){
    return new PouchDB('database')
}