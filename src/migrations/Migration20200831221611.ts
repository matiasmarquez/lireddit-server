import { Migration } from 'mikro-orm';

export class Migration20200831221611 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `post` (`id` int unsigned not null auto_increment primary key, `created_at` datetime not null, `updated_at` datetime not null, `title` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
  }

}
