import {
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Field, ID, ObjectType } from 'type-graphql';
import { Item } from './Item';

@ObjectType()
@Entity()
@Unique({ properties: ['username', 'email'] })
export class User {
  @Field(() => ID)
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property()
  username!: string;

  @Field(() => String)
  @Property()
  email: string;

  @Field({ nullable: true })
  @Property({ nullable: true })
  avatarUrl?: string;

  @Field(() => String)
  @Property({ type: 'date' })
  createdAt? = new Date();

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt? = new Date();

  @Field(() => [Item])
  @OneToMany(() => Item, (item) => item.seller)
  itemsForSale?: Item[];
}