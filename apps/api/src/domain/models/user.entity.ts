import type { DateTime, EntityId } from "@myself/shared";

export interface UserProps {
  id: EntityId;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: DateTime;
}

export class User {
  constructor(public readonly props: UserProps) {}

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
