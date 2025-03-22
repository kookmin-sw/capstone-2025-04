#include <stdio.h>
int main()
{
    int n;
    scanf("%d",&n);
    if(!(n%4) && !!(n%100) || !(n%400)) puts("1");
    else puts("0");
}