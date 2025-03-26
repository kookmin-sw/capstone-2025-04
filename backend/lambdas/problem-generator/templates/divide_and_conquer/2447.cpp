// BOJ - 2447 별 찍기 - 10

#include <iostream>

using namespace std;

int star(int x, int y)
{
    while(x != 0)
    {
        if((x%3 == 1) & (y%3 == 1)) return ~printf(" ");
        x/=3; y/=3;
    }
    return ~printf("*");
}
int main()
{
    cin.tie(0); ios::sync_with_stdio(false);
    int n; cin >> n;
    for(int i = 0; i < n; i++)
    {
        for(int j = 0; j < n; j++)
            star(i, j);
        puts("");
    }
}