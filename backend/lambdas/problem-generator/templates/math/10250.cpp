#include <stdio.h>
int main()
{
	int t;
	scanf("%d",&t);
	for(int i=1; i<=t; i++)
	{
		int H,W,N;
		scanf("%d %d %d",&H,&W,&N);
		printf("%d%02d\n",!(N%H)?H:N%H,(N-1)/H+1);
	}
}