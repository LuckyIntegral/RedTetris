export class Player {
  id: string;
  name: string;
  socketId: string;
  isAlive = true;

  constructor(id: string, name: string, socketId: string) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
  }
}
