import type { DateTime } from "../../utils/date";
import { type EntityId, type UserProps, userPropsSchema } from "../../schemas";

export { type UserProps };

export class User {
  public readonly props: UserProps;

  constructor(rawProps: UserProps) {
    this.props = userPropsSchema.parse(rawProps);
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
    return this.props.avatarUrl ?? undefined;
  }

  get createdAt(): DateTime {
    return this.props.createdAt;
  }
}
