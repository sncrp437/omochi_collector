export interface Prefecture {
  prefecture: string;
  stations: string[];
}

export interface AreasState {
  prefectures: Prefecture[];
  loading: boolean;
}
