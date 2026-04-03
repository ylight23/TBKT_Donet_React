import { toast, ToastOptions } from 'react-toastify';

const DEFAULT_AUTO_CLOSE = 2500;

function error(message: string | string[], options?: ToastOptions): void {
    toast.error(formatMessage(message), {...options, autoClose: options?.autoClose ? options.autoClose : DEFAULT_AUTO_CLOSE});
}

function success(message: string | string[], options?: ToastOptions): void {
    toast.success(formatMessage(message), {...options, autoClose: options?.autoClose ? options.autoClose : DEFAULT_AUTO_CLOSE});
}

function warn(message: string | string[], options?: ToastOptions): void {
    toast.warn(formatMessage(message), {...options, autoClose: options?.autoClose ? options.autoClose : DEFAULT_AUTO_CLOSE});
}

function info(message: string | string[], options?: ToastOptions): void {
    toast.info(formatMessage(message), {...options, autoClose: options?.autoClose ? options.autoClose : DEFAULT_AUTO_CLOSE});
}

function _default(message: string | string[], options?: ToastOptions): void {
    toast(formatMessage(message), {...options, autoClose: options?.autoClose ? options.autoClose : DEFAULT_AUTO_CLOSE});
}

function formatMessage(message: string | string[]): string {
    let result: string;

    if (Array.isArray(message)) {
        const HTML = message.map((item, i) => `<p key={i}>{${item}}</p>`);
        result = `<div className='notify-content'>${HTML.join('')}</div>`;
    } else {
        result = message;
    }
    return result;
}

const notify = { error, success, warn, info, default: _default };
export default notify;
