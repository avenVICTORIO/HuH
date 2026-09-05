export interface NotificationMessage {
  title: string;
  body: string;
  tag: string;
}

export interface NotificationGateway {
  readonly supported: boolean;
  permission(): NotificationPermission | 'unsupported';
  requestPermission(): Promise<NotificationPermission | 'unsupported'>;
  send(message: NotificationMessage): void;
}

export class BrowserNotificationGateway implements NotificationGateway {
  get supported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  permission(): NotificationPermission | 'unsupported' {
    return this.supported ? Notification.permission : 'unsupported';
  }

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.supported) {
      return 'unsupported';
    }
    return Notification.requestPermission();
  }

  send(message: NotificationMessage): void {
    if (!this.supported || Notification.permission !== 'granted') {
      return;
    }
    new Notification(message.title, {
      body: message.body,
      tag: message.tag,
    });
  }
}

export class MemoryNotificationGateway implements NotificationGateway {
  readonly supported = true;
  messages: NotificationMessage[] = [];
  currentPermission: NotificationPermission = 'granted';

  permission(): NotificationPermission {
    return this.currentPermission;
  }

  async requestPermission(): Promise<NotificationPermission> {
    return this.currentPermission;
  }

  send(message: NotificationMessage): void {
    if (this.currentPermission === 'granted') {
      this.messages.push(message);
    }
  }
}
