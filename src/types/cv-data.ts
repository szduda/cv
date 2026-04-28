export interface SectionItem {
  title: string;
  list: string[];
}

export interface ProjectItem {
  title: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  description: string;
}

export interface GenericSection {
  title: string;
  items: SectionItem[];
}

export interface EmploymentTimelineItem {
  side: "left" | "right";
  heading: string;
  text: string;
}

export interface EmploymentSection {
  title: string;
  items: EmploymentTimelineItem[];
}

export interface CvData {
  meta: {
    lang: string;
    description: string;
  };
  person: {
    name: string;
    phoneLabel: string;
    emailLabel: string;
    phone: string;
    phoneHref: string;
    email: string;
    emailHref: string;
  };
  intro: string[];
  skills: {
    title: string;
    items: SectionItem[];
  };
  projects: {
    title: string;
    items: ProjectItem[];
  };
  tools: GenericSection;
  employment: EmploymentSection;
  education: GenericSection;
  pdfDownloadLabel: string;
  footer: string;
}
