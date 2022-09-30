/**
 * Tests how an array with a bunch of primitives is represented in JSON schema.
 */
export interface InterfaceWithPrimitives {
  /**
   * A property of type number.
   */
  readonly numberProperty: number;

  /**
   * A property of type string.
   */
  readonly stringProperty: string;

  /**
   * Array of strings.
   */
  readonly arrayOfStrings: string[];

  /**
   * Optional boolean
   */
  readonly optionalBoolean?: boolean;

  //
  // intentionally left blank (to check that description is omitted)
  //
  readonly mapOfNumbers: { [key: string]: number };
}

export enum MyNormalEnum {
  ENUM_MEMBER_1,
  ENUM_MEMBER_2,
  ENUM_MEMBER_3,
}

/**
 * Tests how properties accepting a Behavioral Interface are represented in JSON Schema
 */
export interface InterfaceWithBehavioral {
  /**
   * A feature implementation.
   */
  readonly feature: IFeature;
}

export interface IFeature {
  /**
   * A behavioral interface method.
   */
  doStuff(): string;
}

export class FeatureFactory implements IFeature {
  public static baseFeature(): FeatureFactory {
    return new FeatureFactory();
  }

  private constructor() {}

  doStuff(): string {
    throw new Error('Method not implemented.');
  }
}

export class AnotherFactory implements IFeature {
  public static baseFeature(value: string): AnotherFactory {
    return new AnotherFactory(value);
  }

  private constructor(private readonly value: string) {}

  doStuff(): string {
    throw new Error('Method not ' + this.value + '.');
  }
}

export class NonImplementingFactory {
  public static factoryOne(): IFeature {
    return {
      doStuff: () => 'hello',
    };
  }

  public static factoryTwo(value: string): IFeature {
    return {
      doStuff: () => value,
    };
  }

  private constructor() {}
}
