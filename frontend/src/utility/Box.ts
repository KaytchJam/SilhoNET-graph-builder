
abstract class BoxBase<T> {
    abstract open(): T | undefined;

    map<U>(fn: (value: T) => U): BoxBase<U> {
        return new MapBox(this, fn);
    }

    flatMap<U>(fn: (value: T) => BoxBase<U>): BoxBase<U> {
        return new FlatMapBox(this, fn);
    }

    filter(predicate: (value: T) => boolean): BoxBase<T> {
        return new FilterBox(this, predicate);
    }

    unwrapOr(defaultValue: T): T {
        const val = this.open();
        return val !== undefined ? val : defaultValue;
    }

    tag(b: boolean): BoxBase<[boolean, T]> {
        return new TagBox(this, b);
    }
}

class TagBox<T> extends BoxBase<[boolean, T]> {
    private inner: BoxBase<T>;
    private btag: boolean;

    constructor(inner: BoxBase<T>, btag: boolean) {
        super();
        this.inner = inner;
        this.btag = btag;
    }

    open(): [boolean, T] | undefined {
        const val: T | undefined = this.inner.open();
        return val !== undefined ? [this.btag, val] : undefined;
    }
} 

class MapBox<T, U> extends BoxBase<U> {
    private inner: BoxBase<T>;
    private fn: (x: T) => U;

    constructor(inner: BoxBase<T>, fn: (x: T) => U) {
        super();
        this.inner = inner;
        this.fn = fn;
    }

    open(): U | undefined {
        const val = this.inner.open();
        return val !== undefined ? this.fn(val) : undefined;
    }
}

class FlatMapBox<T, U> extends BoxBase<U> {
    private inner: BoxBase<T>;
    private fn: (x: T) => BoxBase<U>;

    constructor(inner: BoxBase<T>, fn: (x: T) => BoxBase<U>) {
        super();
        this.inner = inner;
        this.fn = fn;
    }

    open(): U | undefined {
        const val = this.inner.open();
        return val !== undefined ? this.fn(val).open() : undefined;
    }
}

class FilterBox<T> extends BoxBase<T> {
    private inner: BoxBase<T>;
    private predicate: (x: T) => boolean;

    constructor(inner: BoxBase<T>, predicate: (x: T) => boolean) {
        super();
        this.inner = inner;
        this.predicate = predicate;
    }

    open(): T | undefined {
        const val = this.inner.open();
        return val !== undefined && this.predicate(val) ? val : undefined;
    }
}

export class NBox extends BoxBase<number> {
    item: number;
    constructor(item: number) {
        super();
        this.item = item;
    }

    static of(item: number): NBox {
        return new NBox(item);
    }

    open(): number {
        return this.item;
    }
}