#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab/contract';
import endContract from '../../snapshots/2c3ee0e049a74a92cbc0364ca54d685d3d7279dcc7e2a6739df998e08582fcab/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'achievement',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('condition', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('icon', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'achievement_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'answerOption',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isCorrect', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('questionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('text', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'assessment',
        columns: [
          col('courseId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('moduleId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'assessment_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
          checkExpression(
            'assessment_type_check_4796802b',
            "\"type\" IN ('MODULE', 'COURSE_FINAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'assessmentAttempt',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('completedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('score', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'course',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'course_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'lesson',
        columns: [
          col('content', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('moduleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'lesson_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
          checkExpression('lesson_type_check_d5e378c7', "\"type\" IN ('THEORY', 'LABORATORY')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'lessonProgress',
        columns: [
          col('completedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('lessonId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['userId', 'lessonId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'module',
        columns: [
          col('courseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'module_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'passwordReset',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('codeHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'question',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('explanation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('statement', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'question_status_check_29df5947',
            "\"status\" IN ('DRAFT', 'ACTIVE', 'ARCHIVED')",
          ),
          checkExpression(
            'question_type_check_9cc3fa43',
            "\"type\" IN ('MULTIPLE_CHOICE', 'TRUE_FALSE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'questionResponse',
        columns: [
          col('answerOptionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('attemptId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('questionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordChangedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_cb8771da',
            "\"role\" IN ('STUDENT', 'TEACHER', 'ADMINISTRATIVE', 'VISITOR', 'MENTOR')",
          ),
          checkExpression('user_status_check_56c81764', "\"status\" IN ('ACTIVE', 'DISABLED')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'userAchievement',
        columns: [
          col('achievementId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('earnedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notifiedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'achievement',
        constraint: 'achievement_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'answerOption',
        constraint: 'answerOption_questionId_order_key',
        columns: ['questionId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'assessment',
        constraint: 'assessment_moduleId_key',
        columns: ['moduleId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'assessment',
        constraint: 'assessment_courseId_key',
        columns: ['courseId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'assessmentAttempt',
        constraint: 'assessmentAttempt_userId_assessmentId_key',
        columns: ['userId', 'assessmentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'lesson',
        constraint: 'lesson_moduleId_order_key',
        columns: ['moduleId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'module',
        constraint: 'module_courseId_order_key',
        columns: ['courseId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'question',
        constraint: 'question_assessmentId_order_key',
        columns: ['assessmentId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'questionResponse',
        constraint: 'questionResponse_attemptId_questionId_key',
        columns: ['attemptId', 'questionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'userAchievement',
        constraint: 'userAchievement_userId_achievementId_key',
        columns: ['userId', 'achievementId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'answerOption',
        index: 'answerOption_questionId_idx_fdb42076',
        columns: ['questionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'assessmentAttempt',
        index: 'assessmentAttempt_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'assessmentAttempt',
        index: 'assessmentAttempt_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lesson',
        index: 'lesson_moduleId_idx_04fe188b',
        columns: ['moduleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lessonProgress',
        index: 'lessonProgress_lessonId_idx_e358970d',
        columns: ['lessonId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lessonProgress',
        index: 'lessonProgress_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'module',
        index: 'module_courseId_idx_12f72d2a',
        columns: ['courseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'passwordReset',
        index: 'passwordReset_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'question',
        index: 'question_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'questionResponse',
        index: 'questionResponse_answerOptionId_idx_8aacf1d1',
        columns: ['answerOptionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'questionResponse',
        index: 'questionResponse_attemptId_idx_94f50eb9',
        columns: ['attemptId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'questionResponse',
        index: 'questionResponse_questionId_idx_fdb42076',
        columns: ['questionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'userAchievement',
        index: 'userAchievement_achievementId_idx_05a27a05',
        columns: ['achievementId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'userAchievement',
        index: 'userAchievement_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'answerOption',
        foreignKey: {
          name: 'answerOption_questionId_fkey',
          columns: ['questionId'],
          references: { schema: 'public', table: 'question', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'assessment',
        foreignKey: {
          name: 'assessment_moduleId_fkey',
          columns: ['moduleId'],
          references: { schema: 'public', table: 'module', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'assessment',
        foreignKey: {
          name: 'assessment_courseId_fkey',
          columns: ['courseId'],
          references: { schema: 'public', table: 'course', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'assessmentAttempt',
        foreignKey: {
          name: 'assessmentAttempt_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'assessmentAttempt',
        foreignKey: {
          name: 'assessmentAttempt_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'assessment', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lesson',
        foreignKey: {
          name: 'lesson_moduleId_fkey',
          columns: ['moduleId'],
          references: { schema: 'public', table: 'module', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lessonProgress',
        foreignKey: {
          name: 'lessonProgress_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lessonProgress',
        foreignKey: {
          name: 'lessonProgress_lessonId_fkey',
          columns: ['lessonId'],
          references: { schema: 'public', table: 'lesson', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'module',
        foreignKey: {
          name: 'module_courseId_fkey',
          columns: ['courseId'],
          references: { schema: 'public', table: 'course', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'passwordReset',
        foreignKey: {
          name: 'passwordReset_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'question',
        foreignKey: {
          name: 'question_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'assessment', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'questionResponse',
        foreignKey: {
          name: 'questionResponse_attemptId_fkey',
          columns: ['attemptId'],
          references: { schema: 'public', table: 'assessmentAttempt', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'questionResponse',
        foreignKey: {
          name: 'questionResponse_questionId_fkey',
          columns: ['questionId'],
          references: { schema: 'public', table: 'question', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'questionResponse',
        foreignKey: {
          name: 'questionResponse_answerOptionId_fkey',
          columns: ['answerOptionId'],
          references: { schema: 'public', table: 'answerOption', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'userAchievement',
        foreignKey: {
          name: 'userAchievement_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'userAchievement',
        foreignKey: {
          name: 'userAchievement_achievementId_fkey',
          columns: ['achievementId'],
          references: { schema: 'public', table: 'achievement', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
