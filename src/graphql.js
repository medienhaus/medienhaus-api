
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export interface Space {
    id: string;
    name?: Nullable<string>;
    type?: Nullable<string>;
    template?: Nullable<string>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    parents?: Nullable<Nullable<Entry>[]>;
    allocation?: Nullable<Allocation>;
    origin?: Nullable<Origin>;
    description?: Nullable<Nullable<Description>[]>;
    localDepth?: Nullable<string>;
}

export class Origin {
    application?: Nullable<Nullable<Application>[]>;
    server?: Nullable<Nullable<Server>[]>;
    authors?: Nullable<Nullable<User>[]>;
}

export class Description {
    language: string;
    content?: Nullable<string>;
}

export class Allocation {
    physical?: Nullable<Nullable<Physical>[]>;
    temporal?: Nullable<Nullable<Temporal>[]>;
}

export class Application {
    name?: Nullable<string>;
}

export class Physical {
    app?: Nullable<string>;
    lat?: Nullable<string>;
    lng?: Nullable<string>;
    info?: Nullable<string>;
    radius?: Nullable<string>;
    Path?: Nullable<Nullable<string>[]>;
}

export class Temporal {
    app: string;
    start?: Nullable<string>;
    end?: Nullable<string>;
    timestamp?: Nullable<string>;
    year?: Nullable<string>;
    month?: Nullable<string>;
    day?: Nullable<string>;
    hour?: Nullable<string>;
    minute?: Nullable<string>;
    second?: Nullable<string>;
}

export class Entry implements Space {
    id: string;
    type?: Nullable<string>;
    template?: Nullable<string>;
    name?: Nullable<string>;
    parents?: Nullable<Nullable<Entry>[]>;
    content?: Nullable<Nullable<Content>[]>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    allocation?: Nullable<Allocation>;
    origin?: Nullable<Origin>;
    description?: Nullable<Nullable<Description>[]>;
    localDepth?: Nullable<string>;
}

export class Item implements Space {
    id: string;
    type?: Nullable<string>;
    template?: Nullable<string>;
    name?: Nullable<string>;
    parents?: Nullable<Nullable<Entry>[]>;
    content?: Nullable<Nullable<Content>[]>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    allocation?: Nullable<Allocation>;
    origin?: Nullable<Origin>;
    description?: Nullable<Nullable<Description>[]>;
    localDepth?: Nullable<string>;
}

export class Context implements Space {
    id: string;
    type?: Nullable<string>;
    template?: Nullable<string>;
    name?: Nullable<string>;
    item?: Nullable<Nullable<Item>[]>;
    parents?: Nullable<Nullable<Entry>[]>;
    content?: Nullable<Nullable<Content>[]>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    allocation?: Nullable<Allocation>;
    origin?: Nullable<Origin>;
    description?: Nullable<Nullable<Description>[]>;
    localDepth?: Nullable<string>;
}

export class Content implements Space {
    id: string;
    type?: Nullable<string>;
    template?: Nullable<string>;
    name?: Nullable<string>;
    parents?: Nullable<Nullable<Entry>[]>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    allocation?: Nullable<Allocation>;
    origin?: Nullable<Origin>;
    description?: Nullable<Nullable<Description>[]>;
    localDepth?: Nullable<string>;
}

export class User {
    id: string;
    name?: Nullable<string>;
    server?: Nullable<Server>;
    thumbnail?: Nullable<string>;
    thumbnail_full_size?: Nullable<string>;
    context?: Nullable<Nullable<Context>[]>;
    item?: Nullable<Nullable<Item>[]>;
    content?: Nullable<Nullable<Content>[]>;
}

export class Server {
    url: string;
    users?: Nullable<Nullable<User>[]>;
    context?: Nullable<Nullable<Context>[]>;
    item?: Nullable<Nullable<Item>[]>;
    content?: Nullable<Nullable<Content>[]>;
}

export abstract class IQuery {
    abstract spaces(template?: Nullable<string>, type?: Nullable<string>): Nullable<Nullable<Entry>[]> | Promise<Nullable<Nullable<Entry>[]>>;

    abstract space(id: string): Nullable<Entry> | Promise<Nullable<Entry>>;

    abstract items(): Nullable<Nullable<Item>[]> | Promise<Nullable<Nullable<Item>[]>>;

    abstract contexts(): Nullable<Nullable<Context>[]> | Promise<Nullable<Nullable<Context>[]>>;

    abstract contents(): Nullable<Nullable<Content>[]> | Promise<Nullable<Nullable<Content>[]>>;

    abstract servers(): Nullable<Nullable<Server>[]> | Promise<Nullable<Nullable<Server>[]>>;

    abstract server(url: string): Nullable<Server> | Promise<Nullable<Server>>;

    abstract users(): Nullable<Nullable<User>[]> | Promise<Nullable<Nullable<User>[]>>;

    abstract user(id: string): Nullable<User> | Promise<Nullable<User>>;
}

type Nullable<T> = T | null;
