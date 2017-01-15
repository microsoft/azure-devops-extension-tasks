declare module uuidv5 {
    type uuid = string | Buffer
    enum space { dns, url, oid, x500, null, default }
    type ns = uuid | space

    export interface createUUIDv5 {
        (namespace: ns, name: uuid): uuid;
        (namespace: ns, name: uuid, binary: boolean): uuid;

		uuidToString(uuid: Buffer): string;
        uuidFromString(uuid: string): Buffer;
        createUUIDv5: uuidv5.createUUIDv5;
        space: uuidv5.space;
	}
}

declare const exp: uuidv5.createUUIDv5;
export = exp;