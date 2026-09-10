import type { DateTime } from "../../utils/date";
import {
  type AuthorProps,
  authorPropsSchema,
  type EntityId,
} from "../../schemas";

export { type AuthorProps };

export class Author {
  public readonly props: AuthorProps;

  constructor(rawProps: AuthorProps) {
    this.props = authorPropsSchema.parse(rawProps);
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
