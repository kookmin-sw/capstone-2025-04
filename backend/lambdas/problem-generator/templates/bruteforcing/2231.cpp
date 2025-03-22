// BOJ - 2231 분해합

#include <iostream>

using namespace std;

int f(int n)
{
    int sum = 0;
    while(n != 0)
    {
        sum += (n % 10);
        n /= 10;
    }
    return sum;
}

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    int n; cin >> n;
    for(int i = 1; i <= n; i++)
        if(i + f(i) == n)
            return !printf("%d", i);
            
    return !printf("0");
}