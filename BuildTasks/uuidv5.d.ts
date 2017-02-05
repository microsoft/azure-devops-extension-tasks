declare module 'uuidv5' {
    type uuid = string | Buffer;
    enum space { dns, url, oid, x500, null, default }
    type ns = uuid | space;

    interface createUUIDv5 {
        (namespace: ns, name: uuid): uuid;
        (namespace: ns, name: uuid, binary: boolean): uuid;

        uuidToString(uuid: Buffer): string;
        uuidFromString(uuid: string): Buffer;
        createUUIDv5: createUUIDv5;
        spaces: typeof space;
    }
    var exp: createUUIDv5;
    export = exp;
}