export class Player {
  id: string;
  name: string;
  socketId: string;
  isAlive = true;
  diedAt: Date | null = null;

  constructor(id: string, name: string, socketId: string) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
  }
}
