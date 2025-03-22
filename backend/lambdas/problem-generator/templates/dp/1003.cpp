// BOJ - 1003

#include <stdio.h>

int D[41]={0,1};

void setup()
{
	for(int i=2; i<=40; i++)
		D[i]=D[i-1]+D[i-2];
}

int main()
{
	setup();
	int n;
	scanf("%d",&n);
	while(n--)
	{
		int k;
		scanf("%d",&k);
		if(k<=1) printf("%d %d\n",1-k,k);
		else
			printf("%d %d\n",D[k]-D[k-2],D[k]);
	}
}

