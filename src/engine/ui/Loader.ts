/**
 * Creates a spinner element. Append wherever a loading indicator is needed.
 * 
 * ```ts
 * const loader = new Loader();
 * someContainer.appendChild(loader.element);
 * ```
 */
export class Loader {
    public readonly element: HTMLSpanElement;

    constructor() {
        this.element = document.createElement('span');
        this.element.className = 'loader';
    }
}
