import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookDto } from './create-book.dto';
import { UpdateBookDto } from './update.book.dto';

const valid = {
  title: 'Livro de história',
  publisher: 'Editora',
  externalUrl: 'https://example.org/livro',
  year: '2024',
  authors: JSON.stringify(['550e8400-e29b-41d4-a716-446655440000']),
};

describe('Book ISBN validation', () => {
  it.each(['2233-332--322', '0012-0334--555'])(
    'preserves the ISBN string %s when creating a book via multipart',
    async (isbn) => {
      const dto = plainToInstance(CreateBookDto, { ...valid, isbn });

      expect(await validate(dto)).toEqual([]);
      expect(dto.isbn).toBe(isbn);
      expect(dto.year).toBe(2024);
      expect(dto.authors).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
    },
  );

  it('preserves a hyphenated ISBN during an update', async () => {
    const dto = plainToInstance(UpdateBookDto, { isbn: '0012-0334--555' });

    expect(await validate(dto)).toEqual([]);
    expect(dto.isbn).toBe('0012-0334--555');
  });

  it('rejects a numeric ISBN', async () => {
    const dto = plainToInstance(CreateBookDto, { ...valid, isbn: 2233332 });

    expect((await validate(dto)).map((error) => error.property)).toContain(
      'isbn',
    );
  });

  it('requires a valid book link when creating a record', async () => {
    const dto = plainToInstance(CreateBookDto, { ...valid, externalUrl: '' });

    expect((await validate(dto)).map((error) => error.property)).toContain(
      'externalUrl',
    );
  });
});
