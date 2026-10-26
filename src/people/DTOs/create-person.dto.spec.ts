import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePersonDto } from './create-person.dto';
import { UpdatePersonDto } from './update-person.dto';
import { PeopleQueryDto } from './people-query.dto';

describe('External person validation', () => {
  it('accepts an external participant without academic credentials or contact details', async () => {
    const person = plainToInstance(CreatePersonDto, {
      name: 'Ana Convidada',
      category: 'EXTERNO',
    });
    expect(await validate(person)).toEqual([]);
  });

  it('normalizes empty form fields to null on creation and editing', async () => {
    const input = {
      name: 'Ana Convidada',
      category: 'EXTERNO',
      email: '',
      nationalityId: '',
      academicTitleId: '',
      institutionId: '',
    };
    for (const dto of [CreatePersonDto, UpdatePersonDto]) {
      const person = plainToInstance(dto, input);
      expect(await validate(person)).toEqual([]);
      expect(person).toMatchObject({
        email: null,
        nationalityId: null,
        academicTitleId: null,
        institutionId: null,
      });
    }
  });

  it('retains mandatory profile fields for existing categories', async () => {
    const person = plainToInstance(CreatePersonDto, {
      name: 'Maria',
      category: 'PESQUISADOR',
    });
    expect(
      (await validate(person)).map((error) => error.property).sort(),
    ).toEqual(['academicTitleId', 'email', 'institutionId', 'nationalityId']);
  });

  it.each([
    { email: 'invalid' },
    { academicTitleId: 'invalid' },
    { institutionId: 'invalid' },
    { nationalityId: 'invalid' },
  ])('validates provided external profile data: %j', async (fields) => {
    const person = plainToInstance(CreatePersonDto, {
      name: 'Ana',
      category: 'EXTERNO',
      ...fields,
    });
    expect(await validate(person)).toHaveLength(1);
  });

  it('validates category filters and rejects unrecognized categories', async () => {
    expect(
      await validate(plainToInstance(PeopleQueryDto, { category: 'EXTERNO' })),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(PeopleQueryDto, { excludeCategory: 'EXTERNO' }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(PeopleQueryDto, { excludeCategory: 'INVALID' }),
      ),
    ).toHaveLength(1);
  });
});
