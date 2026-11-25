import {
  entityIdSchema,
  type DateTime,
  type EntityId,
} from "../../../primitives";

/**
 * Domain user profile, independent of the Better Auth identity table (D3).
 *
 * The auth row stores `image` and millisecond timestamps; the persistence mappers
 * are the only place that knows that shape and translate it into this entity.
 */
export interface UserProps {
  id: EntityId;
  name: string;
  email: string;
  imageUrl: string | null;
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
    const imageUrl = rawProps.imageUrl?.trim();
    this.props = {
      ...rawProps,
      id,
      name: rawProps.name.trim(),
      email: rawProps.email.trim(),
      imageUrl: imageUrl ? imageUrl : null,
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

  get imageUrl(): string | null {
    return this.props.imageUrl;
  }

  get createdAt(): DateTime {
    return this.props.createdAt;
  }
}
