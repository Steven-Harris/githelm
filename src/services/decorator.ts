export function handleLoading(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const parentClass = this.constructor.prototype;
    if (parentClass.loading) {
      parentClass.loading = true;
    }

    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (error) {
      throw error;
    } finally {
      if (parentClass.loading) {
        parentClass.loading = false;
      }
    }
  };

  return descriptor;
}