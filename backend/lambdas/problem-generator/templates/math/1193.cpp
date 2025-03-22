#include <stdio.h>
int main()
{
	int n,x=0,y=0;
	scanf("%d",&n);
	for(int k=2;;k++)
	{
		if(!(k%2))
		{
			y=0;
			for(x=k-1; x>=1; x--)
			{
				y++;
				n--;
				if(!n)
				{
					printf("%d/%d",x,y);
					return 0;
				}
			}
		}
		else
		{
			y=k;
			for(x=1; x<=k-1; x++)
			{
				y--;
				n--;
				if(!n)
				{
					printf("%d/%d",x,y);
					return 0;
					
				}
			}
		}
	}
}