import type { DateTime } from "@myself/shared";

export interface AuthorProps {
  id: string;
  name: string;
  bio?: string;
  createdAt: DateTime;
}

export class Author {
  constructor(public readonly props: AuthorProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get bio(): string | undefined {
    return this.props.bio;
  }

  get createdAt(): DateTime {
    return this.props.createdAt;
  }
}
