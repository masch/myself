import {
  entityIdSchema,
  type DateTime,
  type EntityId,
} from "../../../primitives";

export interface UserProps {
  id: EntityId;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: DateTime;
}

export class User {
  public readonly props: UserProps;

  constructor(rawProps: UserProps) {
    const id = entityIdSchema.parse(rawProps.id);
    if (!rawProps.name || rawProps.name.trim().length === 0) {
      throw new Error("User name is required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawProps.email || !emailRegex.test(rawProps.email.trim())) {
      throw new Error("Invalid email address");
    }
    this.props = {
      ...rawProps,
      id,
      name: rawProps.name.trim(),
      email: rawProps.email.trim(),
      avatarUrl: rawProps.avatarUrl?.trim(),
    };
  }

  get id(): EntityId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  get createdAt(): DateTime {
    return this.props.createdAt;
  }
}
