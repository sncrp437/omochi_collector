interface TitleItem {
  id: number;
  content: string;
  isPrimary: boolean;
}

interface DescriptionItem {
  id: number;
  content: string;
}

export interface SceneItem {
  id: number;
  title: TitleItem[];
  description: DescriptionItem[];
}

interface DiagonalProps {
  background: string;
  position: "top" | "middle" | "bottom";
  top: number;
  size: string;
  angle: number;
  reverse?: boolean;
}

interface ButtonNavigateProps {
  title: string;
  type: "login" | "youtube" | "article";
}

export interface IntroductionSectionData {
  id: number;
  type: "normal" | "guide";
  diagonal: DiagonalProps;
  listTitle: string[];
  description?: string | null;
  buttonNavigate: ButtonNavigateProps | null;
  buttonArticle: ButtonNavigateProps | null;
  image: string | null;
  sceneList: SceneItem[];
  hasPartnerStore: boolean;
}
