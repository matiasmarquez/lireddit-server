import { Migration } from 'mikro-orm';

export class Migration20200908220236 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table `user` add `email` varchar(255) not null;');
    this.addSql('alter table `user` add unique `user_email_unique`(`email`);');
  }

}
