import type { DateTime, EntityId } from "../../../primitives";

export interface AuthorProps {
  id: EntityId;
  name: string;
  bio?: string;
  createdAt: DateTime;
}

export class Author {
  public readonly props: AuthorProps;

  constructor(rawProps: AuthorProps) {
    if (!rawProps.id) {
      throw new Error("Invalid ID format");
    }
    if (!rawProps.name || rawProps.name.trim().length === 0) {
      throw new Error("Author name is required");
    }
    this.props = {
      ...rawProps,
      name: rawProps.name.trim(),
      bio: rawProps.bio?.trim(),
    };
  }

  get id(): EntityId {
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
