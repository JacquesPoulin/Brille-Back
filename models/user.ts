import connection from '../db-config';
import IUser from '../interfaces/IUser';
import argon2, { Options } from 'argon2';
import { ResultSetHeader } from 'mysql2';
import { NextFunction, Request, Response } from 'express';
import { ErrorHandler } from '../helpers/errors';

const hashingOptions: Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 5,
  parallelism: 1,
};

const hashPassword = (password: string): Promise<string> => {
  return argon2.hash(password, hashingOptions);
};

const verifyPassword = (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return argon2.verify(hashedPassword, password, hashingOptions);
};

const emailIsFree = async (req: Request, res: Response, next: NextFunction) => {
  // Récupèrer l'email dans le req.body
  const user = req.body as IUser;
  // Vérifier si l'email appartient déjà à un user
  const userExists: IUser = await getUserByEmail(user.email);
  // Si oui => erreur
  if (userExists) {
    next(new ErrorHandler(409, `This user already exists`));
  } else {
    // Si non => next
    next();
  }
};

const getAllUsers = async (sortBy = ''): Promise<IUser[]> => {
  let sql = `SELECT id, firstname, lastname, email, created, phone, modified, admin FROM users`;
  if (sortBy) {
    sql += ` ORDER BY ${sortBy}`;
  }
  const results = await connection.promise().query<IUser[]>(sql);
  return results[0];
};

const getUserById = async (idUser: number): Promise<IUser> => {
  const [results] = await connection
    .promise()
    .query<IUser[]>(
      'SELECT id, firstname, lastname, email, created, phone, modified, admin FROM users WHERE id = ?',
      [idUser]
    );
  return results[0];
};

const getUserByEmail = async (email: string): Promise<IUser> => {
  const [results] = await connection
    .promise()
    .query<IUser[]>(
      'SELECT id, email, password, firstname,created, phone, modified, admin FROM users WHERE email = ?',
      [email]
    );
  return results[0];
};

const addUser = async (user: IUser): Promise<number> => {
  const hashedPassword = await hashPassword(user.password);
  const results = await connection
    .promise()
    .query<ResultSetHeader>(
      'INSERT INTO users (firstname, lastname, email, password, admin,created, phone, modified,) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.firstname, user.lastname, user.email, hashedPassword, user.admin, user.created, user.phone, user.modified,]
    );
  return results[0].insertId;
};

const updateUser = async (idUser: number, user: IUser): Promise<boolean> => {
  let sql = 'UPDATE users SET ';
  const sqlValues: Array<string | number | boolean | Date> = [];
  let oneValue = false;

  if (user.firstname) {
    sql += 'firstname = ? ';
    sqlValues.push(user.firstname);
    oneValue = true;
  }
  if (user.lastname) {
    sql += oneValue ? ', lastname = ? ' : ' lastname = ? ';
    sqlValues.push(user.lastname);
    oneValue = true;
  }
  if (user.email) {
    sql += oneValue ? ', email = ? ' : ' email = ? ';
    sqlValues.push(user.email);
    oneValue = true;
  }
  if (user.created) {
    sql += oneValue ? ', created = ? ' : ' created = ? ';
    sqlValues.push(user.created);
    oneValue = true;
  }
  if (user.phone) {
    sql += oneValue ? ', phone = ? ' : ' phone = ? ';
    sqlValues.push(user.phone);
    oneValue = true;
  }
  if (user.modified) {
    sql += oneValue ? ', modified = ? ' : ' modified = ? ';
    sqlValues.push(user.modified);
    oneValue = true;
  }
  if (user.password) {
    sql += oneValue ? ', password = ? ' : ' password = ? ';
    const hashedPassword: string = await hashPassword(user.password);
    sqlValues.push(hashedPassword);
    oneValue = true;
  }
  if (user.admin != undefined) {
    sql += oneValue ? ', admin = ? ' : ' admin = ? ';
    sqlValues.push(user.admin);
    oneValue = true;
  }
  sql += ' WHERE id = ?';
  sqlValues.push(idUser);

  const results = await connection
    .promise()
    .query<ResultSetHeader>(sql, sqlValues);
  return results[0].affectedRows === 1;
};

const deleteUser = async (idUser: number): Promise<boolean> => {
  const results = await connection
    .promise()
    .query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [idUser]);
  return results[0].affectedRows === 1;
};

export {
  verifyPassword,
  getAllUsers,
  addUser,
  getUserByEmail,
  getUserById,
  deleteUser,
  updateUser,
  emailIsFree,
};
