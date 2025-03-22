// BOJ - 1080

#include <stdio.h>

int main()
{
	int n,m;
	scanf("%d%d",&n,&m);
	int a[n+1][m+1]={0};
	int b[n+1][m+1]={0};
	for(int i=1; i<=n; i++)
		for(int j=1; j<=m; j++)
			scanf("%1d",&a[i][j]);
	for(int i=1; i<=n; i++)
		for(int j=1; j<=m; j++)
			scanf("%1d",&b[i][j]);
	int chk[n+1][m+1]={0};
	for(int i=1; i<=n; i++)
		for(int j=1; j<=m; j++)
		{
			if(a[i][j]==b[i][j])
				chk[i][j]=0; // same
			else
				chk[i][j]=1; // different
		}
	
	if(n<3 || m<3)
	{
		for(int i=1; i<=n; i++)
			for(int j=1; j<=m; j++)
				if(chk[i][j])
				{
					printf("-1");
					return 0;
				}
		printf("0");
		return 0;
	}
	int ans=0;
	for(int i=1; i<=n-2; i++)
	{
		for(int j=1; j<=m-2; j++)
		{
			if(chk[i][j])
			{
				ans++;
				for(int p=i; p<=i+2; p++)
					for(int q=j; q<=j+2; q++)
						chk[p][q]=1-chk[p][q];
			}
		}
	}
	
	int noanswer=0;
	for(int i=1; i<=n; i++)
		for(int j=1; j<=m; j++)
			if(chk[i][j])
				noanswer=1;
	if(noanswer) printf("-1");
	else printf("%d",ans);
	
}