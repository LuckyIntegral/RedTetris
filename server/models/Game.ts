import { RowDataPacket } from 'mysql2';

export interface GameRow extends RowDataPacket {
  game_id: number;
  started_at: Date;
  finished_at: Date;
  player_id: number;
  player_username: string;
  player_email: string;
  score: number;
  place: number;
}

export interface GameRecordDto {
  player: { id: number; username: string; email: string };
  score: number;
  place: number;
}

export interface GameDTO {
  game_id: number;
  started_at: Date;
  finished_at: Date;
  players: GameRecordDto[];
}
