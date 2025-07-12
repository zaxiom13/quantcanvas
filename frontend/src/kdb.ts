// A robust kdb+ WebSocket client
class KdbWebSocketClient {
    private url: string;
    private socket: WebSocket | null;
    private onMessageCallback: ((data: any) => void) | null;
    private onConnectCallback: (() => void) | null;
    private onCloseCallback: (() => void) | null;
    private onErrorCallback: ((error: Error) => void) | null;
    private isConnected: boolean;

    constructor(url: string) {
        this.url = url;
        this.socket = null;
        this.onMessageCallback = null;
        this.onConnectCallback = null;
        this.onCloseCallback = null;
        this.onErrorCallback = null;
        this.isConnected = false;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isConnected && this.socket) {
                resolve();
                return;
            }
            
            this.socket = new WebSocket(this.url);
            
            const timeout = setTimeout(() => {
                if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
                    this.socket.close();
                    reject(new Error('Connection timeout. Ensure kdb+ is running on the correct port.'));
                }
            }, 3000);

            this.socket.onopen = () => {
                clearTimeout(timeout);
                this.isConnected = true;
                if (this.onConnectCallback) this.onConnectCallback();
                resolve();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onMessageCallback) {
                        this.onMessageCallback(data);
                    }
                } catch (error) {
                    console.error('Error parsing kdb+ message:', error);
                    if (this.onMessageCallback) {
                        this.onMessageCallback(event.data);
                    }
                }
            };

            this.socket.onclose = () => {
                clearTimeout(timeout);
                if (this.isConnected) {
                    this.isConnected = false;
                    if (this.onCloseCallback) this.onCloseCallback();
                }
            };

            this.socket.onerror = (event: Event) => {
                clearTimeout(timeout);
                const error = new Error('WebSocket connection failed.');
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
                reject(error);
            };
        });
    }

    query(queryString: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.socket) {
                reject(new Error('Not connected to kdb+'));
                return;
            }

            const tempCallback = (data: any) => {
                // Restore generic handler after query resolves
                this.onMessageCallback = tempOnMessage;
                resolve(data);
            };
            
            // Temporarily replace generic handler with query-specific one
            const tempOnMessage = this.onMessageCallback;
            this.onMessageCallback = tempCallback;
            
            this.socket.send(queryString);
        });
    }
    
    // Set a persistent handler for general messages
    setOnMessage(callback: (data: any) => void) {
        this.onMessageCallback = callback;
    }

    setOnConnect(callback: () => void) {
        this.onConnectCallback = callback;
    }

    setOnClose(callback: () => void) {
        this.onCloseCallback = callback;
    }

    setOnError(callback: (error: Error) => void) {
        this.onErrorCallback = callback;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
        }
    }

    getIsConnected(): boolean {
        return this.isConnected;
    }
}

const KdbUtils = {
    formatTable(data: any): any[] {
        if (!data || !Array.isArray(data)) return [];
        return data.map(row => (typeof row === 'object' && row !== null ? row : { value: row }));
    },
    formatList(data: any): any[] {
        return Array.isArray(data) ? data : [data];
    },
    formatQuery(query: string): string {
        return query.trim();
    }
};

export { KdbWebSocketClient, KdbUtils }; 